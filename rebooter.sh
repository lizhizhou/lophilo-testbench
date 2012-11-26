#!/bin/bash
let i=0
let success=0
let failed=0
let BOOTDELAY=25

EXPECTED="Lophilo ended detection, found 0xa5a5a5a5"
EXPECTED_SERIAL="FTDI USB Serial Device converter now attached to ttyUSB1"
while true
do
	echo "Pinging $LMC_IP"
	ping -w 1 -q $LMC_IP 2>&1 > /dev/null
	if [ "$?" -ne 0 ]; then
		echo "Host $LMC_IP not up, retrying"
		continue
	fi
	SSH=`echo "" | nc $LMC_IP 22 -q 1 | grep dropbear`
	if [ -z "$SSH" ]; then
		echo "SSH service on $LMC_IP not up yet, retrying"
		continue
	fi
	let i=$i+1
	FILENAME=$LMC_IP-$i.dmesg
	ssh -o StrictHostKeyChecking=false lophilo@$LMC_IP "sudo dmesg" > $FILENAME
	LOPHILO=`grep "$EXPECTED" $FILENAME`
	if [ -z "$LOPHILO" ]; then
		let failed=$failed+1
		echo "FAILED: expected string $EXPECTED not found, see $FILENAME"
	else
		let success=$success+1
		echo "SUCCESS: Expected string $EXPECTED found in dmesg, removing file and rebooting (iteration $i)"
		rm -f $FILENAME
	fi
	echo "SUCCESS: $success FAILED: $failed ITERATION: $i"
	ssh -o StrictHostKeyChecking=false lophilo@$LMC_IP "sudo reboot"
	echo "Sleeping $BOOTDELAY seconds while waiting for reboot"
	sleep $BOOTDELAY
done

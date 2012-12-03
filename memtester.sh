#!/bin/bash
DEBPKG=memtester_4.2.2-1_armel.deb
SSH=`echo "" | nc $LMC_IP 22 -q 1 | grep dropbear`
if [ -z "$SSH" ]; then
	echo "SSH service on $LMC_IP not up yet"
	exit 10
fi

MEMTESTER=`ssh lophilo@$LMC_IP "which memtester"`
if [ -z "$MEMTESTER" ]; then
	echo "memtester not installed, installing..."
	scp -o StrictHostKeyChecking=false  $DEBPKG lophilo@$LMC_IP:
	if [ "$?" -ne 0 ]; then
		echo "Could not copy $DEBPKG to $LMC_IP"
		exit 20
	fi
	ssh -o StrictHostKeyChecking=false lophilo@$LMC_IP "sudo dpkg -i $DEBPKG"
	if [ "$?" -ne 0 ]; then
		echo "Could not install $DEBPKG on $LMC_IP"
		exit 30
	fi
else
	echo "memtester already installed"
fi

echo "Running memtester on $LMC_IP"
ssh -o StrictHostKeyChecking=false lophilo@$LMC_IP "sudo memtester 111 1"
if [ "$?" -ne 0 ]; then
	echo "Could not run memtester on $LMC_IP or test failed"
	exit 40
else
	echo "TEST SUCCESS"
fi